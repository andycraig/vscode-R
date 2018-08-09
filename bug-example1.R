polys = SpatialPolygonsDataFrame(
    SpatialPolygons(list(
        Polygons(list(
            Polygon(coords = rbind(c(0, 0), c(0, 2), c(2, 2), c(2, 0), c(0, 0)))
        ), ID = "1")),
    SpatialPolygons(list(
        Polygons(list(
            Polygon(coords = rbind(c(3, 0), c(3, 2), c(5, 2), c(5, 0), c(3, 0)))
        ), ID = "2"))
    )), data = data.frame(id = c(1,2))

    
    # Anywhere other than first line.
    
    survey_data_long = survey_data %>%
        # Change disease/severity from wide to long.
        gather(disease_severity, severity_percentage, ends_with("_severity")) %>%
        separate(disease_severity, into = c("disease_name", "unnecessary_indicator"), sep = ":") %>%
        dplyr::select(-unnecessary_indicator) %>%
        # Change disease/incidence from wide to long.
        gather(disease_incidence, incidence_percentage, ends_with("_incidence")) %>%
        separate(disease_incidence, into = c("disease_name_from_incidence", "unnecessary_indicator"), sep = ":") %>%
        dplyr::select(-unnecessary_indicator, disease_name_from_incidence) %>%
        # Convert severity, incidence percentages into scores.
        mutate(severity_score = bin_severity(severity_percentage)) %>%
        mutate(incidence_score = bin_incidence(incidence_percentage)) %>%
        mutate(spores = get_spores(severity_score, incidence_score, field_area))
    
    # Anywhere other than first line.
    
     survey_data_with_clusters = survey_data_long %>%
        mutate(cluster_id = associate_with_clusters(., cluster_poly, id_col)) %>%
        # Next line raises warning about different attributes but okay.
        left_join(cluster_df, by = setNames(id_col, "cluster_id")) # id_col is for y, "cluster_id" is for x.
