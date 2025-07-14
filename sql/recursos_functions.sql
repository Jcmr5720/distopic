-- SQL functions for resources module

-- actualizar_recursos_generados: actualiza y devuelve los recursos generados para una fabrica
create or replace function public.actualizar_recursos_generados(
    p_usuario_id uuid,
    p_tipo_recurso text
) returns bigint
language plpgsql
as $$
declare
    v_f fabricas_usuario%rowtype;
    v_cfg configuracion_fabricas.generacion_por_minuto%type;
    v_generado bigint := 0;
    v_seconds numeric;
begin
    select * into v_f from fabricas_usuario
      where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso
      for update;
    if not found then
        raise exception 'Fabrica no encontrada';
    end if;

    select generacion_por_minuto into v_cfg from configuracion_fabricas
      where tipo_recurso = p_tipo_recurso and nivel = v_f.nivel;

    v_seconds := extract(epoch from (now() - v_f.ultima_recogida));
    v_generado := floor((v_seconds / 60) * coalesce(v_cfg,0));

    if v_generado > 0 then
        execute format('update recursos_usuario set %I = %I + $1 where usuario_id = $2',
                       p_tipo_recurso, p_tipo_recurso)
        using v_generado, p_usuario_id;
    end if;

    update fabricas_usuario
       set ultima_recogida = now()
     where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso;

    return v_generado;
end;
$$;

-- iniciar_mejora_fabrica: deduce recursos y marca inicio de mejora
create or replace function public.iniciar_mejora_fabrica(
    p_usuario_id uuid,
    p_tipo_recurso text
) returns void
language plpgsql
as $$
declare
    v_f fabricas_usuario%rowtype;
    v_cfg mejora_fabricas_config%rowtype;
begin
    select * into v_f from fabricas_usuario
      where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso
      for update;
    if not found then
        raise exception 'Fabrica no encontrada';
    end if;

    select * into v_cfg from mejora_fabricas_config
      where tipo_recurso = p_tipo_recurso and nivel_destino = v_f.nivel + 1;
    if not found then
        raise exception 'No existe configuracion de mejora';
    end if;

    -- verificar recursos suficientes
    perform 1 from recursos_usuario
      where usuario_id = p_usuario_id
        and chrono_polvo >= v_cfg.costo_chrono_polvo
        and cristal_etereo >= v_cfg.costo_cristal_etereo
        and combustible_singularidad >= v_cfg.costo_combustible_singularidad
        and nucleos_potencia >= v_cfg.costo_nucleos_potencia
        and creditos_galacticos >= v_cfg.costo_creditos_galacticos
        and sustancia_x >= v_cfg.costo_sustancia_x
      for update;
    if not found then
        raise exception 'Recursos insuficientes';
    end if;

    update recursos_usuario set
        chrono_polvo = chrono_polvo - v_cfg.costo_chrono_polvo,
        cristal_etereo = cristal_etereo - v_cfg.costo_cristal_etereo,
        combustible_singularidad = combustible_singularidad - v_cfg.costo_combustible_singularidad,
        nucleos_potencia = nucleos_potencia - v_cfg.costo_nucleos_potencia,
        creditos_galacticos = creditos_galacticos - v_cfg.costo_creditos_galacticos,
        sustancia_x = sustancia_x - v_cfg.costo_sustancia_x
     where usuario_id = p_usuario_id;

    update fabricas_usuario
       set inicio_mejora = now()
     where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso;
end;
$$;

-- completar_mejora_fabrica: finaliza la mejora si el tiempo ha transcurrido
create or replace function public.completar_mejora_fabrica(
    p_usuario_id uuid,
    p_tipo_recurso text
) returns void
language plpgsql
as $$
declare
    v_f fabricas_usuario%rowtype;
    v_cfg mejora_fabricas_config%rowtype;
    v_fin timestamp;
begin
    select * into v_f from fabricas_usuario
      where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso
      for update;
    if not found or v_f.inicio_mejora is null then
        raise exception 'No hay mejora en curso';
    end if;

    select * into v_cfg from mejora_fabricas_config
      where tipo_recurso = p_tipo_recurso and nivel_destino = v_f.nivel + 1;

    v_fin := v_f.inicio_mejora + make_interval(secs => v_cfg.tiempo_mejora_segundos);
    if now() < v_fin then
        raise exception 'La mejora aun no ha terminado';
    end if;

    update fabricas_usuario
       set nivel = nivel + 1,
           inicio_mejora = null,
           ultima_recogida = now()
     where usuario_id = p_usuario_id and tipo_recurso = p_tipo_recurso;
end;
$$;
